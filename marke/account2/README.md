# Marke Account 2 („Was wäre, wenn …“-POV): Bildmarke

**Stand:** 01.11.2026 · **Status:** Entwurf, der Inhaber gibt frei

> **Nicht im Video verwenden.** Wie bei Simulierbar ist das Logo nur für das Profilbild (TikTok, YouTube), Banner und Impressum gedacht.

## Konzept „Fragezeichen-Countdown“
- **Fragezeichen** aus glasierter Keramik: das Gedankenexperiment („Was wäre, wenn …?“). Selbst konstruierter Strich mit runden Enden, keine Schrift, also keine Schriftlizenz nötig.
- **Countdown-Ring aus 5 Segmenten:** „5 Sekunden, die Uhr läuft“. Vier Segmente leuchten in Koralle, das erste ist schon abgelaufen (dunkel).
- **Punkt = kleine türkise Welt:** Die Welt steht auf dem Spiel.
- **Familie mit Simulierbar:** dieselbe Material- und Lichtqualität (Blender 5.2, Cycles, Bausteine aus `marke/logo/skripte/gemeinsam.py`). Die Farben sind bewusst andere, damit beide Kanäle klar getrennt bleiben.

## Farben
| Rolle | Wert |
|---|---|
| Koralle (Ring) | `#FF4F5A` |
| Abgelaufen (Ring-Segment) | `#3B3F55` |
| Türkis (Welt) | `#2EC4B6` |
| Porzellanweiß (Fragezeichen) | `#F4F2ED` |
| Hintergrund Profilbild | Verlauf `#2C2646` (Mitte) → `#0D0B16` (Rand), dezentes Koralle- und Türkis-Licht |

## Dateien (`logo/`)
| Datei | Zweck |
|---|---|
| `account2-logo-fragezeichen-profilbild-1080.png` | **Profilbild TikTok und YouTube**, 1080×1080, quadratisch hochladen; TikTok schneidet rund zu, das Motiv reicht bis ca. 83 % des Kreisdurchmessers |
| `account2-logo-fragezeichen-profilbild-400.jpg` | Reserve 400×400 unter 50 KB, falls ein Upload die große Datei ablehnt |
| `account2-logo-fragezeichen-freigestellt-2048.png` | transparent, für Banner und Impressum |
| `account2-logo-fragezeichen-pruefbild-klein.png` | Kontrolle in 110 px und 48 px im Kreis, dunkler und heller Modus |
| `account2-logo-fragezeichen.blend` / `.glb` | Blender-Szene bzw. glTF für Three.js |

Erzeugen: `/home/user/.venv-blender/bin/python skripte/konzept_fragezeichen.py` (Render 2048 px), danach `python3 skripte/nachbearbeitung_account2.py`.

**TikTok-Profilbild (S, Drittquellen, keine offizielle TikTok-Seite gefunden):** quadratisch, wird rund angezeigt, mindestens 200×200 px, Motiv in den inneren 80 %.
