# Automatisierung: Auto-Posting und WhatsApp-Radar

**Stand:** 31.10.2026 · Preise abgerufen am 31.10.2026 · Auftrag: Videos automatisch posten (TikTok + YouTube Shorts) und den Trend-Radar per WhatsApp schicken.

**Kennzeichnung:** **[Fakt]** = belegt, mit Link. **[Fakt, Zweitquelle]** = nur über Drittseiten, Händlerblogs oder Zusammenfassungen belegt, vor dem Bezahlen gegenprüfen. **[Schätzung]** = von mir gerechnet. **[Annahme]** = nicht belegt.

**Recherche-Grenzen (ehrlich vorab):**
- `developers.tiktok.com`, `developers.google.com` und `support.tiktok.com` waren per WebFetch nicht erreichbar (Host nicht freigegeben). Firecrawl lehnt TikTok-Domains ab und hatte danach keine Credits mehr.
- Die TikTok- und Google-Aussagen stammen deshalb aus Auszügen der Originalseiten, die Suchergebnisse zeigten. Wo nur eine Zusammenfassung vorlag, steht „Zweitquelle“.
- Preise ohne Euro-Angabe sind in US-Dollar. Umrechnung ≈ 0,9 € je $ **[Annahme]**.

---

## 1. Kurzfazit und Empfehlung

### Teil 1: Posting
- **Ja, auditierte Partner-Tools dürfen öffentlich auf TikTok posten.** TikTok bietet Direct Post ausdrücklich für Drittplattformen an. Nur Clients **ohne Audit** bleiben privat. Die Regel „Kein Bot-Posting“ sollte deshalb enger gefasst werden (Vorschlag in Abschnitt 4).
- **Empfehlung: Buffer „Essentials“, 2 Kanäle (TikTok + YouTube), ca. $10/Monat (≈ 9 €) bei Jahreszahlung.** Grund: günstigste Lösung mit dokumentierter API, dokumentiertem KI-Label für **beide** Plattformen und Unterstützung für persönliche TikTok-Konten.
- **Alternative: Metricool** (Gratis-Tarif oder Starter ab 16 €), wenn dir ein EU-Anbieter und ein offizieller MCP-Server wichtiger sind als die API.
- **Nicht empfohlen:** Hootsuite (ca. 89 €/Monat), Ayrshare (ca. 134 €/Monat), Postiz (Audit der Postiz-TikTok-App nicht belegt), eigene TikTok-App (eigener Audit nötig).
- **Vor dem Bezahlen testen:** Mit dem Gratis-Tarif ein Video öffentlich posten und prüfen, ob es wirklich öffentlich ist. Welche Tools TikTok auditiert hat, steht nirgends öffentlich, die Prüfung ist der einzige sichere Weg **[Annahme]**.
- **Mensch bleibt in der Schleife:** Claude legt Entwürfe an, du gibst frei. TikTok verlangt, dass Nutzer „full awareness and control“ über das Gepostete haben.

### Teil 2: WhatsApp
- **Empfehlung in zwei Stufen:**
  1. **CallMeBot** (0 €, ca. 15 Minuten) als Test parallel zur bestehenden Push-Nachricht. Nur Text an deine eigene Nummer. Inoffiziell, Betreiber unbekannt.
  2. **Meta WhatsApp Cloud API** (offiziell, ca. 0–2 €/Monat, ca. 1–3 Stunden Einrichtung), wenn du Zuverlässigkeit willst.
- **Nicht empfohlen:** Zapier (kostenpflichtig, nur 7 Vorlagen), Twilio (Aufwand wie Meta plus Aufschlag), Make/n8n (nur Vermittler, löst das WhatsApp-Problem nicht).
- **Ehrliche Nebenbemerkung:** Telegram wäre kostenlos, offiziell und in 10 Minuten eingerichtet. Falls WhatsApp kein Muss ist, ist das der einfachste Weg.

### „Claude ruft an“
- **Ein offizielles Anthropic-Feature „Claude eine Nummer geben, damit er anruft“ habe ich nicht gefunden.**
- Offiziell gibt es einen Sprachmodus (du rufst Claude an, nicht umgekehrt) und „Channels“ (Telegram, Discord, iMessage). Beides ruft dich nicht an.
- Anrufe gibt es nur über **Drittanbieter** (Community-Plugins mit Twilio oder Telnyx). Details in Abschnitt 2.7.

---

## 2. Begründung

### 2.1 Dürfen Partner-Tools öffentlich auf TikTok posten?

| Aussage | Status | Quelle |
|---|---|---|
| TikTok bietet Direct Post für Drittplattformen an: „With Direct Post, our community can easily post content directly from third-party platforms to TikTok.“ | **[Fakt]** | [TikTok for Developers Blog](https://developers.tiktok.com/blog/effortless-sharing-with-direct-post) |
| „All content posted by unaudited clients will be restricted to private viewing mode.“ Um das aufzuheben, muss der Client einen Audit bestehen. | **[Fakt]** | [Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post), [Get Started](https://developers.tiktok.com/doc/content-posting-api-get-started) |
| Fehlercode bei Verstoß: `unaudited_client_can_only_post_to_private_accounts`. | **[Fakt]** | [Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) |
| Nicht auditierte Clients: höchstens 5 Nutzer pro 24 Stunden, Konten müssen privat sein. | **[Fakt]** | [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) |
| „Unaudited API Clients can only post contents in `SELF_ONLY` viewership.“ Nachträglich öffentlich machen geht nur von Hand, pro Video. | **[Fakt]** | [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) |
| Pflicht für API-Clients: „The users of API Clients must have full awareness and control of what is being posted to their TikTok accounts.“ Außerdem keine Werbe-Wasserzeichen. | **[Fakt]** | [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) |
| TikTok führt acht „Content Marketing Partners“: Brandwatch, Dash Hudson, Emplifi, Hootsuite, Khoros, Later, Sprinklr, Sprout Social. | **[Fakt]** | [TikTok for Business](https://ads.tiktok.com/business/en-US/blog/introducing-content-marketing-partners), [Social Media Today](https://www.socialmediatoday.com/news/social-media-managers-can-now-post-to-tiktok-from-their-favorite-social-med/624505/) |
| Metricool steht im TikTok Business App Center. | **[Fakt, Zweitquelle]** | [App Center](https://ads.tiktok.com/apps_and_agents/app-center) |
| Community Guidelines: „We strictly prohibit automation tools, scripts, or other tricks designed to bypass our systems.“ Der Satz steht im Abschnitt „Deceptive Behaviors and Fake Engagement“ (Täuschung, Fake-Interaktion, Manipulation der Empfehlung). | **[Fakt]** | [Integrity and Authenticity](https://www.tiktok.com/safety/en/policies-and-engagement/integrity-authenticity) |
| Es gibt keine öffentliche Liste, welche Tools den Audit bestanden haben. Ich habe keine gefunden. | **[Annahme]** | – |

**Einschätzung:** Ein auditierter Client umgeht nichts. Er nutzt den Weg, den TikTok selbst vorsieht. Das Verbot zielt auf Tricks zum Umgehen der Systeme. Also ist Posten über auditierte Partner-Tools zulässig. **[Schätzung]**, keine Rechtsberatung.

**Weiter verboten bzw. riskant bleiben:**
- Skripte oder Browser-Bots, die TikTok Studio bedienen.
- Uploader, die sich mit deinen Cookies oder Passwörtern anmelden.
- eine eigene unauditierte API-App (postet nur privat und braucht einen eigenen Audit).

**Eigene Korrektur:** In `CLAUDE.md` steht „Kein Bot-Posting. Uploads laufen über die Planungsfunktion von TikTok Studio“. Die Begründung (privat ohne Audit, Verbot von Umgehungstricks) stimmt. Als Pauschalverbot für **jede** API-Nutzung ist die Regel aber zu weit gefasst.

### 2.2 Vergleich Teil A: TikTok (Preise Stand 31.10.2026)

| Tool | Preis pro Monat | TikTok öffentlich, direkt | Planung | KI-Label und Markeninhalt |
|---|---|---|---|---|
| **Buffer** | Free: 3 Kanäle, 10 geplante Posts je Kanal. **Essentials $5 je Kanal** (≈ 4,50 €), $60 pro Kanal und Jahr bei Jahreszahlung. 2 Kanäle ≈ $10 (≈ 9 €). Team $10 je Kanal. **[Fakt]** ([Preise](https://buffer.com/pricing)) | Persönliche und Business-Konten werden unterstützt. Im Composer „Automatic“ (direkt) oder „Notify Me“ (nur Erinnerung). Audit-Status nicht belegt. **[Fakt, Zweitquelle]** ([Buffer TikTok](https://buffer.com/tiktok), [Hilfe](https://support.buffer.com/article/559-using-tiktok-with-buffer)) | Ja, unbegrenzt in Essentials. Limits: 25 Posts je 24 h, Video 3 s bis 10 min, höchstens 1 GB. | KI-Schalter „AI-generated“ für TikTok-Videos und YouTube Shorts. Markeninhalt: nicht gefunden. **[Fakt]** ([Hilfe](https://support.buffer.com/en-us/articles/flagging-posts-as-ai-generated-in-buffer-V7jAnzYJ5n)) |
| **Metricool** | Free 0 € (1 Marke, 20 Posts/Monat). **Starter ab 16 €** (5 Marken, unbegrenzt veröffentlichen). Advanced ab 43 €. **[Fakt]** ([Preise](https://metricool.com/pricing/)) | Auto-Publish für persönliche und Business-Konten, Schalter „AUTO PUBLISH“ muss an sein. Musik nur Top 100, nur zufällig bei Fotos, kein Ort per API. **[Fakt, Zweitquelle]** ([Hilfe](https://help.metricool.com/en/article/schedule-and-post-on-tiktok-pl1qpr/)) | Ja | Schalter „AI-generated content“ unter „TikTok presets“, nur Videos, auch persönliche Konten. Markeninhalt: nicht gefunden. **[Fakt, Zweitquelle]** ([Hilfe](https://help.metricool.com/schedule-and-post-on-tiktok-bkepi), [EU AI Act](https://help.metricool.com/how-to-label-ai-generated-content-for-eu-ai-act-compliance-8a1j8)) |
| **Postiz** (Cloud) | $29 (5 Kanäle), $39 (10), $49 (30), $99 (100); 7 Tage Test. Anzeige evtl. Jahrespreis. ≈ 26 € **[Fakt]** ([Preise](https://postiz.com/pricing)) | „Post directly“ oder „Upload without posting“ (Entwurf im TikTok-Postfach, 24 h). Ohne Audit der TikTok-App wird die Sichtbarkeit auf privat erzwungen. Selbst gehostet brauchst du eine **eigene** TikTok-App samt Audit. **Ob die Cloud-App auditiert ist, ist nicht belegt**; ein GitHub-Issue meldet einen gescheiterten Audit (Datum unbekannt). **[Fakt]** ([Doku](https://docs.postiz.com/providers/tiktok), [Self-Host](https://docs.postiz.com/self-host/providers/tiktok), [Issue 1362](https://github.com/gitroomhq/postiz-app/issues/1362)) | Ja | „Video made with AI“ und Schalter für Markeninhalt vorhanden. **[Fakt]** ([Doku](https://docs.postiz.com/providers/tiktok)) |
| **Later** | Starter $18.75 (≈ 17 €, 1 Social Set), Growth $37.50, Scale $82.50 (Preisstern: vermutlich Jahrespreis). **[Fakt]** ([Preise](https://later.com/pricing/)) | TikTok-Auto-Publish laut Later-Hilfe mit persönlichem oder Business-Konto (mind. 1 öffentliches Video, Einrichtung nur im Web). Eine Drittseite behauptet das Gegenteil. Offizieller TikTok-Partner. **[Fakt, Zweitquelle]** ([Later Hilfe](https://help.later.com/hc/en-us/articles/360042772934-Enable-Auto-Publishing)) | Ja (Starter: 30 Posts je Profil/Monat) | KI-Label und Markeninhalt: nicht gefunden |
| **Publer** | Free (3 Konten, 10 geplante Posts je Konto). **Professional ab $5, Business ab $10** je Konto (≈ 4,50 / 9 €), weitere Konten je ca. $4. 20 % Rabatt bei Jahreszahlung. **[Fakt, Zweitquelle]** ([Preise](https://publer.com/pricing), [Hilfe](https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/)) | Publer bewirbt „planen und direkt auf TikTok posten“. Audit-Status nicht belegt. **[Fakt, Zweitquelle]** ([Publer Blog](https://publer.com/blog/de/verstaerken-sie-ihre-tiktok-strategie-mit-publers-neuem-update-planen-und-posten-sie-direkt-auf-tiktok/)) | Ja | nicht gefunden |
| **Hootsuite** | Standard **$99 je Nutzer** (≈ 89 €, 10 Konten, jährlich), Professional $199, Advanced $399. **[Fakt]** ([Preise](https://www.hootsuite.com/plans)) | Offizieller TikTok-Partner, Planen und Auto-Publish seit 2022. **[Fakt]** ([Social Media Today](https://www.socialmediatoday.com/news/social-media-managers-can-now-post-to-tiktok-from-their-favorite-social-med/624505/)) | Ja | nicht gefunden |
| **upload-post.com** | Free (2 Profile, 10 Uploads/Monat; TikTok laut Anleitung nur im Bezahlplan). **Basic $16** (≈ 14 €, 5 Profile), Professional $33, Advanced $118, Business $350. **[Fakt]** ([Startseite](https://www.upload-post.com/)) | Direct Post über API. **Audit nicht belegt**, keine Aussage dazu gefunden. **[Annahme]** | Ja (`scheduled_date`) | Felder `is_aigc`, `brand_content_toggle`, `brand_organic_toggle`, `privacy_level`. **[Fakt, Zweitquelle]** ([Anleitung](https://docs.upload-post.com/guides/post-to-tiktok-api/)) |
| **Ayrshare** | Premium **$149** (≈ 134 €, 1 Profil), Launch $299, Business ab $599. **[Fakt, Zweitquelle]** ([Preisvergleich](https://www.upload-post.com/ayrshare-pricing/), [Ayrshare](https://www.ayrshare.com/pricing.md)) | „Direct Publishing in Partnerschaft mit TikTok“ laut Ayrshare-Blog (Eigenangabe). **[Fakt, Zweitquelle]** ([Blog](https://www.ayrshare.com/blog/introducing-tiktok-direct-publishing-analytics-and-commenting/)) | Ja | KI-Label dokumentiert; das Label lässt sich nach dem Posten nicht entfernen. **[Fakt, Zweitquelle]** ([Doku](https://www.ayrshare.com/docs/apis/post/social-networks/tiktok)) |

### 2.3 Vergleich Teil B: YouTube, API, EU

| Tool | YouTube Shorts und Kennzeichnung „veränderte oder synthetische Inhalte“ | API bzw. MCP für Claude | Deutschland bzw. EU | Einschränkungen |
|---|---|---|---|---|
| **Buffer** | YouTube Shorts unterstützt, KI-Schalter gilt auch dort. **[Fakt]** ([Hilfe](https://support.buffer.com/en-us/articles/flagging-posts-as-ai-generated-in-buffer-V7jAnzYJ5n)) | Offizielle GraphQL-API (öffentliche Beta seit 2026): `POST https://api.buffer.com`, Header `Authorization: Bearer <Key>`, Key unter Settings > API. Das Flag per API ist belegt (Fehlermeldung bei unzulässigen Posts). API-Zugang in den Bezahlplänen, 3 Keys, 3.000 Anfragen je Kanal/Monat. **Einen offiziellen MCP-Server habe ich nicht gefunden**, nur Drittanbieter. **[Fakt, Zweitquelle]** ([API-Doku](https://developers.buffer.com/guides/rest-migration.md), [Preise](https://buffer.com/pricing), [Community-MCP](https://github.com/ahernan2/buffer-mcp)) | US-Firma, Daten auch in den USA, EU-US Data Privacy Framework, DPA auf Anfrage, keine EU-Datenhaltung belegt. **[Fakt]** ([Buffer Legal](https://buffer.com/legal)) | Medien nur per **öffentlicher URL**, kein Datei-Upload. Beitrag per API weder änderbar noch löschbar (Community-Projekt). API noch Beta. **[Fakt, Zweitquelle]** |
| **Metricool** | YouTube wird unterstützt; das Synthetik-Flag habe ich nicht gefunden. **[Annahme]** | **Offizieller MCP-Server** `https://ai.metricool.com/mcp` (OAuth oder Token): Beiträge planen, ändern, auflisten. Im Gratis-Tarif enthalten. Die eigentliche API (Zapier/Make) erst im Advanced-Tarif. Ob der MCP Videos hochladen kann, ist nicht belegt. **[Fakt, Zweitquelle]** ([MCP](https://metricool.com/metricool-mcp/), [Preise](https://metricool.com/pricing/)) | Spanischer Anbieter **[Annahme]**; Metricool hat einen Leitfaden zur EU-KI-Kennzeichnung. | Gratis: nur 20 geplante Posts/Monat (reicht für ca. 10 Videos auf zwei Plattformen). |
| **Postiz** | YouTube unterstützt; das Flag habe ich nicht gefunden. | MCP, CLI und API in **allen** Plänen. **[Fakt]** ([Preise](https://postiz.com/pricing)) | Selbst hosten in der EU möglich; Cloud-Standort nicht geprüft. | Audit-Risiko bei TikTok (siehe oben). |
| **Later** | YouTube dabei; Flag nicht gefunden. | API-Zugang nicht gefunden. | nicht geprüft | TikTok-Kontotyp widersprüchlich dokumentiert. |
| **Publer** | YouTube dabei; Flag nicht gefunden. | „Access to Publer API & MCP“ nur in der Business-Stufe laut Preisseite. **[Fakt, Zweitquelle]** ([Preise](https://publer.com/pricing)) | nicht geprüft | Zwei Preisangaben in Quellen widersprüchlich. |
| **Hootsuite** | YouTube dabei; Flag nicht gefunden. | Für Standard kein API-Zugang gefunden. | nicht geprüft | Mit ca. 89 € für den Zweck überdimensioniert. |
| **upload-post.com** | `containsSyntheticMedia` und `selfDeclaredMadeForKids` als Felder. **[Fakt, Zweitquelle]** ([Anleitung](https://docs.upload-post.com/guides/post-to-youtube-api)) | Reine API (Python- und JS-SDK, n8n/Make). Kein MCP gefunden. Video-Dateien lassen sich direkt hochladen **[Annahme]**. | Kein Hinweis auf DSGVO oder Sitz gefunden. | Kleiner Anbieter, hält OAuth-Zugang zu deinem Konto. |
| **Ayrshare** | `containsSyntheticMedia` im YouTube-Block dokumentiert. **[Fakt, Zweitquelle]** ([Changelog](https://app.ayrshare.com/docs/whatsnew/latest)) | REST-API in allen Plänen. | US-Anbieter, nicht geprüft | Zu teuer für einen Kanal. |

**Zu „Markeninhalt“:** TikTok kennt in der Direct-Post-API `brand_content_toggle` (bezahlte Partnerschaft) und `brand_organic_toggle` (eigenes Geschäft). Für Simulierbar bleiben beide **AUS**. **[Fakt]** ([Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post))

**Zum KI-Label:** Das Feld heißt `is_aigc`. „If set, the video will be labelled with Creator labeled as AI-generated tag in video's description.“ **[Fakt]** ([Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)). Es ist die Pflicht aus `docs/09-posting-anleitung.md`. Ein Tool ohne diesen Schalter scheidet aus.

### 2.4 YouTube direkt über die Data API (ohne Tool)

| Punkt | Status | Quelle |
|---|---|---|
| Upload über `videos.insert`, **1.600 Einheiten je Aufruf**; Standardkontingent 10.000 Einheiten pro Tag, das sind rund 6 Uploads pro Tag und Projekt. | **[Fakt, Zweitquelle]** | [Quota](https://developers.google.com/youtube/v3/determine_quota_cost) |
| Feld `status.containsSyntheticMedia` (seit 30.10.2024), schreibbar bei `videos.insert` und `videos.update`. | **[Fakt, Zweitquelle]** | [Revision History](https://developers.google.com/youtube/v3/revision_history) |
| Die Regel von 2020: Uploads über `videos.insert` aus nicht geprüften API-Projekten, die **nach dem 28.07.2020** erstellt wurden, sind auf „privat“ beschränkt, bis das Projekt einen Audit besteht. | **[Fakt, Zweitquelle]** | [Revision History](https://developers.google.com/youtube/v3/revision_history), [Audit](https://developers.google.com/youtube/data/guides/quota_and_compliance_audits) |
| Hilfeseite „Videos locked as private“: Gesperrte Videos lassen sich nicht anfechten, nur neu hochladen (über geprüften Dienst oder YouTube Studio). | **[Fakt, Zweitquelle]** | [YouTube Hilfe](https://support.google.com/youtube/answer/7300965?hl=en) |
| **Gilt das noch?** Eine Suchzusammenfassung behauptet, die aktuelle `videos.insert`-Referenz sage inzwischen das Gegenteil. Ich konnte die Seite nicht lesen. Der Widerspruch ist **ungeklärt**. | **[Annahme]**: gilt weiter, bis ein Testupload etwas anderes zeigt | – |

**Folgerung:** Ein eigenes API-Projekt lohnt sich nicht. Du bräuchtest OAuth-Einrichtung plus Audit-Formular. Ein Tool wie Buffer nutzt sein **eigenes, geprüftes** Projekt **[Annahme]**. Danach prüfst du im YouTube Studio, dass das Video nicht „privat“ ist.

### 2.5 Schadet API-Posting der Reichweite oder dem CRP?

- **Kein Beleg für eine Strafe.** Ich habe keine TikTok-Aussage gefunden, die API-Posts schlechter verteilt. **[Annahme]**: Keine Strafe.
- **Hinweise dafür:** Metricool hat 202 Videos verglichen (geplant gegen von Hand) und keinen Reichweitenunterschied gefunden. Das ist ein Eigentest eines Anbieters. **[Fakt, Zweitquelle]** ([ZoomSphere](https://www.zoomsphere.com/blog/does-scheduling-kill-your-tiktok-reach-in-2026), verweist auf den Metricool-Test.) Der Hootsuite-Test betraf Instagram, nicht TikTok.
- **Echtes Risiko:** Postet ein Tool ohne Audit, landet das Video **still auf privat**, sieht aus wie „Algorithmus hasst mich“ und hat null Reichweite. **[Fakt, Zweitquelle]** (ZoomSphere). Darum der Test vor dem Bezahlen.
- **Funktionen, die über die API fehlen:** Musik/Effekte (Metricool: Musik nur Top 100), Ort. Simulierbar nutzt eigenes Audio, das stört nicht.
- **KI-Label:** Laut TikTok beeinflusst es die Verbreitung nicht (siehe `docs/09-posting-anleitung.md`). Bei Ayrshare steht dasselbe in der Doku.
- **CRP:** In den gefundenen CRP-Bedingungen (nur Drittseiten: 10.000 Follower, 100.000 Aufrufe in 30 Tagen, Originalvideos über 1 Minute, persönliches Konto, ab 18) steht nichts zur Upload-Methode. **[Annahme]**: egal. `support.tiktok.com` war nicht abrufbar. Prüfe die Bedingungen einmal auf TikTok selbst. ([Beispiel Zweitquelle](https://adaptlypost.com/blog/tiktok-creator-fund-eligibility-requirements))
- **Nebenwirkung für dich:** Die erste Stunde nach dem Post (Kommentare beantworten, siehe doc 09) fällt im Arbeitsalltag eher auf eine feste Uhrzeit. Plane Posts auf Zeiten, zu denen du Zeit hast.

### 2.6 Teil 2: WhatsApp-Optionen im Vergleich

| Option | Kosten | Aufwand | Zuverlässigkeit | Datenschutz/DSGVO | Auslösung aus der Cloud-Sitzung |
|---|---|---|---|---|---|
| **CallMeBot** | 0 €. „Free API only for personal use“. **[Fakt, Zweitquelle]** ([callmebot.com](https://www.callmebot.com/)) | ca. 15 Min. Kontakt speichern, Freigabe-Nachricht senden, API-Key per WhatsApp erhalten (laut Nutzern bis 2 Min., sonst nach 24 h erneut). | Inoffiziell. Nutzer berichten von Tageslimits (Zahlen nicht offiziell) und Keys, die ausfallen, ohne dass man sie selbst zurücksetzen kann. Support langsam. **[Fakt, Zweitquelle]** (Foren) | Betreiber und Standort **nicht belegt** **[Annahme]**. Deine Nummer und der Nachrichtentext laufen über seinen Dienst. Inhalt (Themenvorschläge) ist unkritisch. Nur Text an dich selbst, keine Gruppen, keine Bilder. | HTTP-GET `https://api.callmebot.com/whatsapp.php?phone=…&text=…&apikey=…`. Der Key ist ein **URL-Parameter**, also keine Header-Injektion als Netzwerk-Secret möglich: **Umgebungsvariable**. Host `api.callmebot.com` freigeben. |
| **Zapier „WhatsApp Notifications“** | Gibt es noch, aber **seit 01.10.2025 Premium-App**, nicht mehr im Free-Plan. Verfügbar in Professional, Team, Enterprise. Zapier-Plan ab ca. $20/Monat laut App-Seite (Professional laut Drittseite $73,50). Nur an die **eigene Nummer**, **nur 7 Vorlagen**. **[Fakt, Zweitquelle]** ([Zapier Hinweis](https://help.zapier.com/hc/en-us/articles/39395817773453-Important-update-WhatsApp-Notifications-is-becoming-a-premium-app), [Start](https://help.zapier.com/hc/en-us/articles/40852749640589-How-to-get-started-with-WhatsApp-Notifications-on-Zapier)) | niedrig bis mittel | gut (offiziell über Meta), aber Berichte „als erfolgreich markiert, nicht angekommen“ ([Community](https://community.zapier.com/troubleshooting-99/troubleshooting-notification-issues-in-whatsapp-52044)) | Zapier ist US-Firma, nicht geprüft. | Webhook-Trigger (ebenfalls Bezahlfunktion) plus Zap. Zapier-Webhook-URL als Secret. |
| **Meta WhatsApp Cloud API** | Nachrichten außerhalb des 24-h-Fensters nur per **Vorlage**. Deutschland: Utility und Authentication ca. **0,0456 €** je Nachricht, Marketing ca. 0,1131 € (zzgl. 19 % USt.) laut Händlerseiten. **Meta nennt die Zahlen nur in CSV/PDF**, die ich nicht lesen konnte. Meta schreibt: Servicenachrichten und Utility-Antworten im Fenster sind nicht berechnet. Seit 01.10.2026 gelten laut Drittseiten Änderungen (erste 1.000 Servicenachrichten je Monat frei), Details widersprüchlich. **[Fakt, Zweitquelle]** ([Meta Preise](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), [Meta Update](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages), [Länderübersicht](https://chatmaxima.com/whatsapp-api-pricing/germany/)). **[Schätzung]:** 1 Nachricht/Tag als Vorlage ≈ 30 × 0,0456 € ≈ 1,40 € + USt. ≈ **1,60 €/Monat** als Obergrenze. | **hoch**: Meta-Entwicklerkonto, App mit WhatsApp-Produkt, Meta Business Portfolio, Nummer (Test-Nummer genügt für den Anfang), Systemnutzer-Token, Vorlage anlegen und genehmigen lassen. **[Schätzung]:** 1–3 Stunden. | **hoch**, offiziell. Der temporäre Token läuft nach < 24 h ab, für Dauerbetrieb Token eines Systemnutzers. **[Fakt]** ([Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)) | Meta/WhatsApp ist Auftragsverarbeiter über die Business-Bedingungen (DPA verfügbar) **[Annahme]**. Konto bei Meta mit Klarnamen nötig. Deine Nummer teilst du ohnehin mit WhatsApp. | `POST https://graph.facebook.com/<Version>/<phone-number-id>/messages` mit Header `Authorization: Bearer <Token>`. Passt zu **Netzwerk-Secret** (Host `graph.facebook.com`). |
| **Twilio** | $0,005 je Nachricht Aufschlag plus Meta-Gebühr (Händlerseite). **[Fakt, Zweitquelle]** ([Landbot](https://landbot.io/blog/twilio-whatsapp-pricing)) Sandbox kostenlos zugänglich. | mittel bis hoch | Sandbox läuft **3 Tage nach dem Beitritt ab**, danach neu beitreten; ohne Nutzernachricht nur Vorlagen. Produktion braucht WhatsApp-Freigabe der Nummer. **[Fakt]** ([Twilio Sandbox](https://www.twilio.com/docs/whatsapp/sandbox), [Regeln](https://help.twilio.com/articles/360017773294-Rules-and-Best-Practices-for-WhatsApp-Messaging-on-Twilio)) | Zusätzlicher Auftragsverarbeiter (Twilio, USA) | HTTPS-POST an `api.twilio.com`, Basic-Auth. Als Netzwerk-Secret möglich **[Annahme]**. Gleiche Meta-Hürden, daher gegenüber direktem Meta-Weg kein Vorteil. |
| **Make.com bzw. n8n** | Make: Free 1.000 Credits/Monat, Core ca. $9–10,59/Monat. n8n Cloud ab ca. 20–24 €/Monat, selbst gehostet gratis plus Server (ca. 5–9 €). **[Fakt, Zweitquelle]** ([Vergleich](https://costbench.com/compare/make-vs-n8n)) | mittel | gut | Zusätzlicher Auftragsverarbeiter. Make/n8n **sind nur Vermittler** und brauchen darunter Meta, Twilio oder CallMeBot. | Webhook-URL aufrufen. Die URL selbst ist das Geheimnis, in Umgebungsvariable. Host der Webhook-URL freigeben. |
| **Telegram-Bot** (nicht gefragt) | 0 €. Bot-API kostenlos; bis 30 Nachrichten/Sekunde. **[Fakt]** ([Bots FAQ](https://core.telegram.org/bots/faq)) | ca. 10 Min. mit BotFather | hoch, offiziell | Telegram-Dienst, Nachrichten nicht Ende-zu-Ende-verschlüsselt (bei Bots) **[Annahme]** | `POST https://api.telegram.org/bot<TOKEN>/sendMessage`. Token steht im Pfad, daher Umgebungsvariable. Host `api.telegram.org` freigeben. |

**Netzwerk und Geheimnisse (gilt für alle Optionen):** Die Cloud-Sitzung erreicht nur freigegebene Hosts. Den Host trägst du im Cloud-Umgebungsmenü der Sitzung (Titelleiste) unter **Bearbeiten > Netzwerkzugriff > Allowed domains** ein. Schlüssel kommen entweder unter **Network secrets** (in älteren App-Versionen „API-Zugangsdaten“; als Header, passt zu Meta und Twilio) oder als **Umgebungsvariable** (für URL-Parameter wie bei CallMeBot und Telegram). Die Bezeichnungen können je nach App-Version abweichen. Neue Sitzungen übernehmen die Werte. Nie Schlüssel in den Chat einfügen, nie ins Repo. ([Anthropic: Cloud-Umgebungen](https://code.claude.com/docs/en/cloud-environments#network-access))

### 2.7 „Claude ruft an“: was ist damit gemeint?

**Offizielle Anthropic-Funktionen (belegt):**
- **Sprachmodus** in den Claude-Apps: Du startest das Gespräch. Kein Anruf von Claude. **[Fakt, Zweitquelle]** ([heise](https://www.heise.de/en/news/Claude-Apps-for-Android-and-iPhone-get-voice-mode-10418246.html), [Android Authority](https://www.androidauthority.com/claude-voice-mode-upgrade-rolling-out-3678314/))
- **Claude Code Channels** (Research Preview, seit Claude Code v2.1.80, März 2026): Ein MCP-Server schiebt Ereignisse aus **Telegram, Discord oder iMessage** in eine **laufende** Sitzung, Claude antwortet über denselben Kanal. Die Sitzung muss geöffnet sein, also taugt das nicht für den Cloud-Lauf um 05:35 Uhr. Es ist Chat, kein Anruf. **[Fakt]** ([Channels-Doku](https://code.claude.com/docs/en/channels), Datum: [Zweitquelle](https://implicator.ai/anthropic-ships-its-openclaw-rival-connecting-claude-code-to-telegram-and-discord))
- **Dispatch** (März 2026): Aufgaben vom Handy an Claude Cowork schicken. Kein Anruf. **[Fakt, Zweitquelle]** ([Forbes](https://www.forbes.com/sites/ronschmelzer/2026/03/20/claude-dispatch-lets-you-control-claude-cowork-with-your-phone/))
- **Push-Nachricht der Claude-App**: nutzt du schon (siehe `STATUS.md`).
- **Ein Anthropic-Feature „Rufnummer geben, Claude ruft an“ habe ich nicht gefunden.** Ein Bericht vom Juni 2026 erwähnt ein neues Telefonhörer-Symbol im iOS-Build; Anthropic hat nichts erklärt, das ist Spekulation. **[Fakt, Zweitquelle]** ([Android Authority](https://www.androidauthority.com/claude-voice-mode-upgrade-rolling-out-3678314/), nur die Suchzusammenfassung gesehen)

**Drittanbieter (belegt als Existenz, nicht geprüft):**
- **„CallMe“ (ZeframLou/call-me):** Claude-Code-Plugin, ruft an, wenn eine Aufgabe fertig ist, hängt oder eine Eingabe braucht. Telnyx oder Twilio, ngrok-Tunnel. ([Eintrag](https://vibeindex.ai/marketplaces/ZeframLou/call-me))
- **„Better Call Claude“:** MCP-Tool `call_me`, ruft über Twilio an und liest eine Nachricht vor. Die Zielnummer ist fest eingestellt, kein Webhook nötig. ([PyPI](https://pypi.org/project/better-call-claude/0.2.0/))
- **„claude-call“ (Patter):** Stop- und Notification-Hook von Claude Code lösen den Anruf aus. ([Seite](https://patterai.github.io/awesome-claude-call/))
- Dazu Voice-Agent-Plattformen (z. B. Bland), die Claude als Gehirn nutzen. ([Beispiel](https://www.bland.ai/blog/can-claude-make-phone-calls))

**Einschätzung:**
- **[Annahme]** Wahrscheinlich meint der Hinweis eines dieser Community-Plugins (vor allem „CallMe“) oder eine Voice-Agent-Plattform, nicht eine Anthropic-Funktion.
- Alle brauchen **ein eigenes Konto bei einem Telefonanbieter** (Twilio, Telnyx) und laufen meist in einer **lokalen** Sitzung. Aus der Cloud-Sitzung wäre der Weg der direkte REST-Aufruf an den Anbieter. **[Annahme]**
- Für den täglichen Radar ist ein Anruf um 05:35 Uhr unpassend. Sinnvoll wäre er höchstens für „dringend“ (z. B. Termin in unter 48 Stunden). **Jetzt nicht umsetzen.**
- Fremden Plugin-Code vor der Installation prüfen und deine Nummer nicht ohne Not an Dienste geben.

---

## 3. Nächste Schritte mit Zeitaufwand

### A. Posting: Test im Gratis-Tarif (ca. 30 Min., du)
1. `buffer.com` > **Get started** > Konto anlegen (E-Mail oder Google).
2. Kanal verbinden > **TikTok** > bei TikTok anmelden > Berechtigungen bestätigen. Das Konto muss öffentlich sein (`docs/09-posting-anleitung.md`, „Privates Konto: AUS“).
3. Kanal verbinden > **YouTube** > Google-Konto > Kanal „Simulierbar“ wählen > erlauben.
4. Neuer Beitrag > nur **TikTok** anwählen > MP4 von Video 1 hochladen > Text aus doc 09 einfügen.
5. TikTok-Einstellungen: Veröffentlichung **„Automatic“** (nicht „Notify Me“), **KI-Schalter „AI-generated“ AN**, Markeninhalt AUS (falls vorhanden), Sichtbarkeit „Alle“ (falls wählbar). Menübezeichnungen können abweichen, ich habe sie nicht in der App gesehen.
6. **Planen** auf ca. 10 Minuten später. Danach in einem Privatfenster oder auf einem zweiten Gerät prüfen:
   - Ist das Video **öffentlich** sichtbar?
   - Steht das KI-Label am Video?
   - Bleibt es **privat**, ist das Tool nicht auditiert: sofort in TikTok auf „Alle“ stellen ([Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)) und **Metricool** testen (gleiche Schritte, Einstellung unter **TikTok presets > AI-generated content**, **AUTO PUBLISH** AN).
7. YouTube: gleicher Ablauf, Titel höchstens 100 Zeichen, KI-Schalter AN. Danach in YouTube Studio > **Inhalte** prüfen: Sichtbarkeit nicht „Privat“ und unter „Mehr anzeigen“ steht **Veränderte oder synthetische Inhalte: Ja**.

### B. Posting: bezahlen und freigeben (ca. 10 Min., du, nur nach bestandenem Test)
1. Buffer > **Billing** > **Essentials** für 2 Kanäle (TikTok, YouTube), Jahreszahlung ≈ $120.
2. Entscheidung treffen, wer die Dateien bereitstellt (Abschnitt 4).

### C. Posting: Claude übernimmt (ca. 2–3 Std. Einrichtung, später 2 Min. je Video)
1. Buffer > **Settings > API** (`publish.buffer.com`) > Schlüssel erzeugen (nur der Eigentümer kann das, laut Drittseite).
2. Cloud-Umgebung der Sitzung (Titelleiste) > **Bearbeiten**:
   - **Network access:** Domain `api.buffer.com` hinzufügen.
   - **Network secrets:** Host `api.buffer.com`, Header `Authorization`, Wert `Bearer <Schlüssel>`. So wie es bei ElevenLabs gemacht ist.
3. **Dateien:** Buffer holt Videos nur über eine **öffentliche URL**. Variante 1: Du lädst das MP4 selbst in Buffer hoch (2 Min., keine Technik). Variante 2: Das MP4 liegt kurz unter einer nicht erratbaren öffentlichen URL (z. B. Objektspeicher mit öffentlichem Link, nach dem Posten löschen). Der Host muss ebenfalls freigegeben werden.
4. Skript `pipeline/post_buffer.py` (gebaut 01.11., Technik siehe **§3C-Technik** unten). Seit der Regel vom 01.11. plant es den Post direkt zur Posting-Zeit ein (kein KI-Label als Standard, keine Freigabe in Buffer); mit `--entwurf` entsteht wie ursprünglich vorgesehen nur ein Entwurf, den du im Buffer-Kalender freigibst (30 Sekunden, entspricht TikToks Vorgabe „full awareness and control“). Der Markeninhalt-Schalter lässt sich per API nicht setzen (siehe §3C-Technik).
5. Wöchentlich 5 Minuten: Prüfen, ob alle Posts öffentlich sind.

### C-Technik: Buffer-Post per API und Supabase-Zwischenspeicher (Stand 01.11.2026)

**Regeln des Inhabers vom 01.11.** (Stand der Umsetzung in `pipeline/post_buffer.py`; in `CLAUDE.md` und `ENTSCHEIDUNGEN.md` nachzutragen): (1) **kein KI-Label als Standard**, nur bei realistischem KI-Inhalt mit `--ki-label`; (2) **kein Entwurf, keine Freigabe in Buffer**: Claude prüft selbst und plant direkt (Status `scheduled`); `--entwurf` bleibt als Schalter für den alten Weg; (3) **feste Posting-Zeiten** pro Kanal; (4) Caption ist Pflicht; (5) Nachprüfung auf der öffentlichen TikTok-Seite nach dem Posten.

**Quelle Buffer:** GraphQL-Introspection von `https://api.buffer.com` am 01.11.2026 (`__schema`, `__type`), plus lesende Abfragen auf die beiden Kanäle. **[Fakt]** Die API ist laut Buffer noch Beta, Namen können sich ändern. `pipeline/post_buffer.py` gleicht seine Eingabe vor jedem Lauf per Introspection mit dem Live-Schema ab (und, falls `graphql-core` installiert ist, auch das ganze Mutations-Dokument).

**Geplanter Post (Standard) und Entwurf per API.** `createPost` mit `mode: customScheduled`, `schedulingType: automatic` und `dueAt` plant den Post; Buffer veröffentlicht zur Zeit selbst, erwarteter Status danach `scheduled`. Mit zusätzlich `saveToDraft: true` entsteht stattdessen ein Entwurf (Status `draft`; laut Schema-Beschreibung werden dann Posting-Limits nicht geprüft und der Post wird erst veröffentlicht, wenn er ausdrücklich geplant wird). Lesen: `post(input:{id})`, `posts(input:{organizationId, filter:{channelIds, status:[…], dueAt:{start,end}}})`. Ändern/Löschen: `editPost` (u. a. `assets`, `dueAt`, `saveToDraft`), `deletePost`. `PostStatus` = `draft`, `scheduled`, `sending`, `sent`, `error`, `needs_approval`.

**Mutation** `createPost(input: CreatePostInput!)` liefert die Union `PostActionPayload` = `PostActionSuccess { post }` oder einen der Fehler `NotFoundError`, `UnauthorizedError`, `UnexpectedError`, `RestProxyError`, `LimitReachedError`, `InvalidInputError` (alle mit `message`). Variablen, wie das Skript sie im Standard sendet (mit `--entwurf` kommt `"saveToDraft": true` dazu, mit `--ki-label` steht `isAiGenerated` auf `true`):

```json
{"input": {
  "channelId": "<Kanal-ID aus channels(...)>",
  "text": "<Caption>",
  "mode": "customScheduled",
  "dueAt": "2026-11-03T11:30:00.000Z",
  "schedulingType": "automatic",
  "assets": [{"video": {"url": "<signierter Link>"}}],
  "metadata": {"tiktok": {"isAiGenerated": false}}
}}
```

| Feld in `CreatePostInput` | Typ | Bedeutung / unser Wert |
|---|---|---|
| `channelId` | `ChannelId!` | ID des TikTok-Kanals; das Skript löst sie über `channels(input:{organizationId})` per Namen auf (`simulierbar`, `stelldirvor.pov`) |
| `text` | `String` | Caption (Pflicht, siehe unten) |
| `mode` | `ShareMode!` | `addToQueue`, `customScheduled`, `shareNext`, `shareNow`; wir: `customScheduled` |
| `dueAt` | `DateTime` | ISO 8601, wir senden UTC (`…Z`): die Posting-Zeit |
| `schedulingType` | `SchedulingType!` | `automatic` (Buffer veröffentlicht zur Zeit selbst) oder `notification` (nur Erinnerung); Standard `automatic`, Schalter `--planung` |
| `saveToDraft` | `Boolean` | `true` = Entwurf; wird nur mit `--entwurf` gesendet |
| `assets` | `[AssetInput!]!` | `[{video: {url: String!}}]`; `VideoAssetInput.thumbnailUrl` darf nicht gesetzt werden (API lehnt ab); optional `metadata {title, thumbnailOffset}` |
| `metadata.tiktok.isAiGenerated` | `Boolean` | **KI-Kennzeichnung („AI-generated“), nur TikTok-Video; Standard `false`, mit `--ki-label` `true`** |
| `metadata.tiktok.title` | `String` | nur für Foto-Posts, ungenutzt |
| `aiAssisted` | `Boolean` | heißt „mit KI-Hilfe von Buffer erstellt“ (Nutzungsstatistik), ist **nicht** die Kennzeichnung; ungenutzt |
| `needsApproval` | `Boolean! = false` | Freigabe-Workflow für Teams; ungenutzt |

Antwortfelder: `post { id status dueAt schedulingType channelId text metadata { ... on TiktokPostMetadata { isAiGenerated type } } assets { id type mimeType source ... on VideoAsset { video { durationMs width height fileSize isVideoProcessing isTranscodingRequired } } } }`. Das Skript prüft daran: `status == "scheduled"` (mit `--entwurf` `"draft"`), `isAiGenerated` gleich dem gesetzten Wert und `dueAt` gleich der gewünschten Zeit. Weicht etwas ab, endet es mit **Exit-Code 2** (der Post existiert dann schon, in Buffer prüfen). Ob `assets[].source` auf Supabase oder auf eine Buffer-Kopie zeigt, steht in der Ausgabe (ein eigenes Feld für eine Buffer-Kopie gibt es im Schema nicht, nur `source`).

**Nicht per API setzbar (wichtig):** `TikTokPostMetadataInput` kennt nur `isAiGenerated` und `title`. Es gibt **kein Feld für Markeninhalt/Branded Content, Sichtbarkeit (öffentlich/privat), Kommentare, Duett oder Stitch**. (YouTube hat dagegen `privacy`.) „Markeninhalt AUS“ und „öffentlich“ gelten also nur, wenn Buffers Standard so ist **[Annahme]**. Ob das Video wirklich öffentlich ist, sagt erst `--nachpruefen` (`privateItem`).

**Posting-Zeiten (Regel, `data/plan/posting_zeiten.json`, alle Zeiten Europe/Berlin, Startwerte bis zur ersten Auswertung):**

| Kanal | Mo–Fr | Sa–So |
|---|---|---|
| `simulierbar` | `mittag` 12:30, `abend` 19:30 | `mittag` 09:30, `abend` 19:30 |
| `stelldirvor.pov` | `abend` 20:30 | `abend` 13:00 |

`--zeit auto:2026-11-03:mittag` nimmt den Wochentag des Datums, sucht den Slot des Kanals und rechnet die Uhrzeit mit `zoneinfo` in UTC um (Sommer- und Winterzeit automatisch; getestet u. a. 24.10. = UTC+2, 26.10. = UTC+1, 29.03.2027 = UTC+2). Unter Windows braucht Python dafür einmal `pip install tzdata`. Weitere Formen: ISO mit Zone (`2026-11-03T12:30:00+01:00`) und `sofort` (= jetzt plus 15 Min., nur für Ausnahmen wie Tests). Liegt die Zeit weniger als 10 Min. in der Zukunft, bricht das Skript ab. Es bricht auch ab, wenn auf dem Kanal innerhalb von ± 20 Min. schon ein geplanter Post oder Entwurf liegt (`--nochmal` hebt das auf).

**Caption (Pflicht, Abbruch bei Verstoß):** nicht leer, 3 bis 5 Hashtags, kein `#fyp`, `#viral`, `#foryou`, höchstens 2.200 Zeichen. Mehrere Zeilen sind nur eine Warnung (Format laut `CLAUDE.md`: eine Zeile).

**Supabase (Zwischenspeicher, privater Bucket `buffer-uploads`):** Aufrufe nach Supabase-Doku, Host `SUPABASE_URL` (Umgebungsvariable bzw. `--supabase-url`; steht nicht im Repo):

| Schritt | Aufruf |
|---|---|
| Upload | `POST {SUPABASE_URL}/storage/v1/object/buffer-uploads/<datum>/<uuid>.mp4`, Body = Datei, `Content-Type: video/mp4` |
| Link | `POST {SUPABASE_URL}/storage/v1/object/sign/buffer-uploads/<pfad>` mit `{"expiresIn": <Sekunden>}` → `signedURL` (relativ, das Skript ergänzt `/storage/v1`). Gültigkeit: bis `dueAt` + 12 h, mindestens 24 h |
| Löschen | `DELETE {SUPABASE_URL}/storage/v1/object/buffer-uploads` mit `{"prefixes": ["<pfad>", …]}` |
| Zugangstest | `GET …/storage/v1/bucket/buffer-uploads` und `POST …/storage/v1/object/list/buffer-uploads` (nur lesend) |

**Anmeldung an Supabase:** Stand 01.11. abends **funktioniert**: Der Proxy setzt den Header `apikey`, das Skript schickt keine Anmelde-Header, und `python3 pipeline/post_buffer.py --pruefen --schreibtest` (Bucket lesen, Mini-Upload, Link, Abruf, Löschen) ist in allen Punkten OK **[Fakt, getestet]**. Falls es sich ändert (Meldung „headers must have required property 'authorization'“): zweiter Proxy-Header `Authorization: Bearer <alter service_role-JWT>` für den Supabase-Host, oder lokal `SUPABASE_KEY` plus `SUPABASE_AUTH=bearer` bzw. `SUPABASE_AUTHORIZATION`. Ein `sb_secret_`-Schlüssel darf laut Doku nicht als Bearer geschickt werden. Das Dateilimit (Gratis-Plan 50 MB je Datei, Entscheidung 01.11.) gilt projektweit, deshalb Upload-Kopie ab 48 MB.

**Nachprüfung nach dem Posten (`--nachpruefen`):** Für jeden Log-Eintrag, dessen Buffer-Post `sent` ist, ruft das Skript `externalLink` aus Buffer ab (ohne `utm_…`-Teil) und liest die **öffentliche** TikTok-Videoseite mit einem normalen Browser-User-Agent (keine internen APIs, kein Login, Schutzmaßnahmen werden nicht umgangen: liefert die Seite keine Daten, steht „nicht prüfbar“ da). In der Seite steht das JSON `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">`, darin `__DEFAULT_SCOPE__` → `webapp.video-detail` → `itemInfo.itemStruct`. Gemeldet werden `privateItem` (muss `false` sein, sonst Fehler), `video.duration` (Abgleich mit dem Original), `aigcLabelType` und `IsAigc`. `aigcLabelType` kommt als Text (`"1"`) und fehlt, wenn kein Label gesetzt ist; war `--ki-label` gesetzt, ist ein fehlendes Label ein Fehler. Danach wird die Supabase-Datei gelöscht (wie bei `--aufraeumen`), das Ergebnis steht als Zeile `nachgeprueft` im Log. Test am 01.11. an drei bereits geposteten Videos von `@simulierbar` **[Fakt, gemessen]**: Gehalt (66 s) öffentlich, kein Label; Treppe (74 s) öffentlich, `aigcLabelType` = 1; GTA (82 s) öffentlich, `aigcLabelType` = 1.

**Ablauf und Aufräumen:** Das Skript trägt Post-ID, Kanal, Supabase-Pfad, Modus (`geplant`/`entwurf`) und KI-Flag in `pipeline/out/buffer_log.jsonl` ein. Die Supabase-Datei bleibt bis nach dem Posten liegen (Buffer holt sie unter Umständen erst zur Posting-Zeit ab). Danach `python3 pipeline/post_buffer.py --nachpruefen` (prüfen und löschen) oder nur `--aufraeumen` (löschen, `--verwaiste`: auch Dateien, deren Post in Buffer gelöscht wurde). Gebrauch: `pipeline/README.md`, Abschnitt „Post über Buffer einplanen“.

### D. WhatsApp Stufe 1: CallMeBot (ca. 15 Min.)
1. Seite `callmebot.com` > Anleitung „WhatsApp“ öffnen. Die **aktuelle Bot-Nummer und den Freigabe-Satz dort ablesen** (ich schreibe sie nicht ab, sie ändern sich).
2. Nummer als Kontakt speichern > Satz per WhatsApp senden > **API-Key** per Antwort abwarten (bis 2 Min.; sonst nach 24 h neu versuchen).
3. Im Browser testen: `https://api.callmebot.com/whatsapp.php?phone=<deine Nummer mit +49>&text=Test&apikey=<Key>`.
4. Cloud-Umgebung > **Bearbeiten**: Domain `api.callmebot.com` freigeben; **Umgebungsvariablen** `CALLMEBOT_PHONE` und `CALLMEBOT_APIKEY` setzen.
5. Trend-Radar-Auftrag ergänzen lassen (nach deiner Freigabe): am Ende nur bei Score ≥ 70 eine kurze Nachricht (Titel, Score, spätestes Posting-Datum, Link zu `docs/trends/vorschlaege.md`), URL-kodiert, höchstens ca. 500 Zeichen **[Annahme: Längenlimit unbekannt]**.
6. **14 Tage** parallel zur Push-Nachricht laufen lassen, dann entscheiden.

### E. WhatsApp Stufe 2: Meta Cloud API (ca. 1–3 Std., nur bei Bedarf)
1. `developers.facebook.com` > **Meine Apps > App erstellen** > Typ **Business** > Produkt **WhatsApp** hinzufügen.
2. **API-Einrichtung**: Test-Nummer wird automatisch angelegt > unter „An“ deine Nummer eintragen und per Code bestätigen.
3. Business-Einstellungen > **Systemnutzer** > Token mit Recht `whatsapp_business_messaging` erzeugen (dauerhaft, anders als der temporäre Token).
4. **WhatsApp Manager > Nachrichtenvorlagen**: Vorlage Kategorie **Utility** mit 1–2 Variablen anlegen und genehmigen lassen. Variablen dürfen laut WhatsApp-Regeln keine Zeilenumbrüche enthalten **[Annahme, Kenntnisstand]**, daher alles in eine Zeile.
5. Cloud-Umgebung: Domain `graph.facebook.com` freigeben; **Network secret** Header `Authorization: Bearer <Token>`; `phone-number-id` als Umgebungsvariable.
6. Kosten beobachten: Meta-Abrechnung nach dem ersten Monat prüfen.

---

## 4. Offene Punkte und Entscheidungen für dich

**Entscheidungen:**
1. **Regel in `CLAUDE.md` anpassen?** Vorschlag: „Kein Posting über inoffizielle Wege (Skripte oder Bots in TikTok Studio, Cookie-Uploader, eigene unauditierte API-App). Erlaubt: offizielle, von TikTok auditierte Partner-Tools mit Freigabe durch den Inhaber, nach Test auf öffentliche Sichtbarkeit.“ Ich habe `CLAUDE.md` und `ENTSCHEIDUNGEN.md` nicht angefasst.
2. **Buffer oder Metricool?** Buffer ist günstiger und hat die API; Metricool ist EU-Anbieter mit offiziellem MCP. Test entscheidet.
3. **Budget:** ca. 9 €/Monat (Buffer) bis 16 €/Monat (Metricool Starter).
4. **Wer stellt die MP4-Dateien bereit?** Selbst in Buffer hochladen (einfach) oder öffentliche URL (mehr Technik, Videos kurz öffentlich).
5. **Wie viel Freigabe?** Entwurf plus deine Freigabe (empfohlen, regelkonform) oder Claude plant selbst. Letzteres widerspricht dem Sinn von TikToks Vorgabe zur Kontrolle durch den Nutzer.
6. **DSGVO:** Buffer ist ein US-Anbieter ohne belegte EU-Datenhaltung. Das ist für Videos und Beschreibungstexte meist unkritisch **[Annahme, keine Rechtsberatung]**. Willst du das akzeptieren?
7. **WhatsApp:** CallMeBot-Test (inoffiziell, gratis) oder gleich Meta (offiziell, Aufwand)? Oder Telegram?
8. **Anrufe:** Nicht jetzt. Nur sagen, falls du „dringend“-Alarme per Telefon willst.

**Offen, weil nicht prüfbar:**
- Welche Tools von TikTok auditiert sind (Test statt Annahme).
- Ob die `videos.insert`-Beschränkung für neue Projekte 2026 noch gilt.
- Ob Buffer, Metricool, Publer oder Later ein Markeninhalt-Feld anbieten (Standard ist AUS, also unkritisch).
- Deutsche Meta-Preise im Original (CSV/PDF der Meta-Seite) und die Änderungen seit 01.10.2026.
- CRP-Bedingungen im Original (`support.tiktok.com`).
- Ob der Metricool-MCP-Server in einer Cloud-Sitzung nutzbar ist und Videos hochladen kann.
- Ob Postiz inzwischen einen TikTok-Audit bestanden hat.

**Pflege:** Preise und Audit-Status ändern sich. Vor dem Bezahlen die Preisseiten erneut ansehen.
